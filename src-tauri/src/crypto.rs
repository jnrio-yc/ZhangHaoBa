use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use argon2::{self, Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::SaltString;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;
use sha2::{Digest, Sha256};

const APP_ENCRYPTION_KEY: &[u8; 32] = b"AccountVault2024SecretKey!@#$%^&";

pub struct Crypto;

impl Crypto {
    pub fn encrypt(plaintext: &str) -> Result<String, String> {
        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(APP_ENCRYPTION_KEY);
        let cipher = Aes256Gcm::new(key);

        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;

        let mut combined = Vec::with_capacity(12 + ciphertext.len());
        combined.extend_from_slice(&nonce_bytes);
        combined.extend_from_slice(&ciphertext);

        Ok(BASE64.encode(&combined))
    }

    pub fn decrypt(encrypted: &str) -> Result<String, String> {
        let combined = BASE64
            .decode(encrypted)
            .map_err(|e| format!("Base64 decode failed: {}", e))?;

        if combined.len() < 12 {
            return Err("Invalid encrypted data".to_string());
        }

        let (nonce_bytes, ciphertext) = combined.split_at(12);
        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(APP_ENCRYPTION_KEY);
        let cipher = Aes256Gcm::new(key);
        let nonce = Nonce::from_slice(nonce_bytes);

        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext).map_err(|e| format!("UTF-8 decode failed: {}", e))
    }

    pub fn mask_value(value: &str, show_prefix: usize, show_suffix: usize) -> String {
        let chars: Vec<char> = value.chars().collect();
        let len = chars.len();

        if len <= show_prefix + show_suffix + 2 {
            return "••••••".to_string();
        }

        let prefix: String = chars[..show_prefix].iter().collect();
        let suffix: String = chars[len - show_suffix..].iter().collect();
        let dots = "••••";

        format!("{}{}{}", prefix, dots, suffix)
    }

    pub fn hash_master_password(password: &str) -> Result<String, String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| format!("Hash failed: {}", e))?;
        Ok(hash.to_string())
    }

    pub fn verify_master_password(password: &str, hash: &str) -> Result<bool, String> {
        let parsed_hash = PasswordHash::new(hash)
            .map_err(|e| format!("Invalid hash: {}", e))?;
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }

    pub fn sha256_hash(data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        format!("{:x}", hasher.finalize())
    }
}
