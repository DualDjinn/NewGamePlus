//! Secretos en reposo cifrados con DPAPI (usuario actual, Windows).
//!
//! Los campos `ra_api_key`, `ra_token` y `steamgriddb_api_key` se guardan en
//! `newgameplus.json` como `dpapi1:<base64>` en vez de texto plano.
//! Compatibilidad: valores sin prefijo se leen como texto plano legacy y se
//! re-cifran en el próximo guardado (ver `migrate_legacy_secrets`).

const PREFIX: &str = "dpapi1:";

const B64: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn b64_encode(data: &[u8]) -> String {
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let t = (b0 << 16) | (b1 << 8) | b2;
        out.push(B64[((t >> 18) & 0x3F) as usize] as char);
        out.push(B64[((t >> 12) & 0x3F) as usize] as char);
        out.push(if chunk.len() > 1 {
            B64[((t >> 6) & 0x3F) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            B64[(t & 0x3F) as usize] as char
        } else {
            '='
        });
    }
    out
}

fn b64_val(c: u8) -> Option<u32> {
    match c {
        b'A'..=b'Z' => Some((c - b'A') as u32),
        b'a'..=b'z' => Some((c - b'a' + 26) as u32),
        b'0'..=b'9' => Some((c - b'0' + 52) as u32),
        b'+' => Some(62),
        b'/' => Some(63),
        _ => None,
    }
}

fn b64_decode(s: &str) -> Result<Vec<u8>, String> {
    let bytes: Vec<u8> = s.bytes().filter(|&b| b != b'=').collect();
    if bytes.len() % 4 == 1 {
        return Err("base64 inválido".into());
    }
    let mut out = Vec::with_capacity(bytes.len() / 4 * 3);
    for chunk in bytes.chunks(4) {
        let mut t = 0u32;
        let mut n = 0;
        for &c in chunk {
            t = (t << 6) | b64_val(c).ok_or("base64 inválido")?;
            n += 1;
        }
        let missing = 4 - n;
        t <<= 6 * missing;
        out.push(((t >> 16) & 0xFF) as u8);
        if n > 2 {
            out.push(((t >> 8) & 0xFF) as u8);
        }
        if n > 3 {
            out.push((t & 0xFF) as u8);
        }
    }
    Ok(out)
}

#[cfg(target_os = "windows")]
fn dpapi_protect(plain: &[u8]) -> Result<Vec<u8>, String> {
    use windows::core::PCWSTR;
    use windows::Win32::Security::Cryptography::{
        CryptProtectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };
    let input = CRYPT_INTEGER_BLOB {
        cbData: plain.len() as u32,
        pbData: plain.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    // SAFETY: blobs válidos, sin UI, entropía nula (ámbito = usuario actual).
    let ok = unsafe {
        CryptProtectData(
            &input,
            PCWSTR::null(),
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    if ok.is_err() {
        return Err("DPAPI no pudo cifrar".into());
    }
    let bytes =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        windows::Win32::Foundation::LocalFree(Some(windows::Win32::Foundation::HLOCAL(
            output.pbData as _,
        )));
    }
    Ok(bytes)
}

#[cfg(target_os = "windows")]
fn dpapi_unprotect(blob: &[u8]) -> Result<Vec<u8>, String> {
    use windows::Win32::Security::Cryptography::{
        CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    };
    let input = CRYPT_INTEGER_BLOB {
        cbData: blob.len() as u32,
        pbData: blob.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    // SAFETY: igual que en dpapi_protect.
    let ok = unsafe {
        CryptUnprotectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    if ok.is_err() {
        return Err("DPAPI no pudo descifrar (¿otro usuario o perfil copiado?)".into());
    }
    let bytes =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        windows::Win32::Foundation::LocalFree(Some(windows::Win32::Foundation::HLOCAL(
            output.pbData as _,
        )));
    }
    Ok(bytes)
}

/// Cifra para guardar. Falla en voz alta: mejor error que plaintext silencioso.
pub fn protect(secret: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(format!(
            "{}{}",
            PREFIX,
            b64_encode(&dpapi_protect(secret.as_bytes())?)
        ))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = secret;
        Err("Cifrado solo soportado en Windows".into())
    }
}

/// Revela para usar. Acepta legacy sin prefijo (migración transparente).
pub fn reveal(stored: &str) -> Result<String, String> {
    match stored.strip_prefix(PREFIX) {
        Some(b64) => {
            let blob = b64_decode(b64)?;
            #[cfg(target_os = "windows")]
            {
                String::from_utf8(dpapi_unprotect(&blob)?)
                    .map_err(|_| "Secreto corrupto".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = blob;
                Err("Cifrado solo soportado en Windows".into())
            }
        }
        None => Ok(stored.to_string()),
    }
}

pub fn reveal_opt(stored: &Option<String>) -> Option<String> {
    stored
        .as_ref()
        .and_then(|s| reveal(s).ok())
        .filter(|s| !s.trim().is_empty())
}

/// Cifra una vez los valores legacy en texto plano. Idempotente.
pub fn migrate_profile_secrets(p: &mut crate::state::models::Profile) {
    for slot in [
        &mut p.ra_api_key,
        &mut p.ra_token,
        &mut p.steamgriddb_api_key,
    ] {
        if let Some(v) = slot {
            if !v.starts_with(PREFIX) && !v.trim().is_empty() {
                if let Ok(enc) = protect(v) {
                    *slot = Some(enc);
                }
            }
        }
    }
}

#[cfg(test)]
mod secrets_tests {
    use super::*;

    #[test]
    fn b64_roundtrip() {
        for s in ["hola", "a", "ab", "abc", "abcd", "API-KEY_123+/="] {
            let enc = b64_encode(s.as_bytes());
            assert_eq!(b64_decode(&enc).unwrap(), s.as_bytes());
        }
        assert!(b64_decode("!!!").is_err());
    }

    #[test]
    fn reveal_accepts_legacy_plaintext() {
        assert_eq!(reveal("plain-key").unwrap(), "plain-key");
        assert_eq!(reveal_opt(&Some("  ".into())), None);
        assert_eq!(reveal_opt(&None), None);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn dpapi_roundtrip() {
        let enc = protect("super-secreto").unwrap();
        assert!(enc.starts_with(PREFIX));
        assert_eq!(reveal(&enc).unwrap(), "super-secreto");
    }
}
