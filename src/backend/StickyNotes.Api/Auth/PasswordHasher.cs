using System.Security.Cryptography;

namespace StickyNotes.Auth;

/// <summary>
/// Hashes and verifies passwords with PBKDF2 (HMAC-SHA256, per-password random
/// salt). The stored form is "salt.subkey" (base64), so the plaintext is never
/// persisted and two equal passwords hash to different strings.
/// </summary>
public sealed class PasswordHasher
{
    private const int SaltBytes = 16;
    private const int SubkeyBytes = 32;
    private const int Iterations = 100_000;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltBytes);
        var subkey = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, SubkeyBytes);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(subkey)}";
    }

    public bool Verify(string password, string storedHash)
    {
        var parts = (storedHash ?? string.Empty).Split('.');
        if (parts.Length != 2)
        {
            return false;
        }

        byte[] salt, expected;
        try
        {
            salt = Convert.FromBase64String(parts[0]);
            expected = Convert.FromBase64String(parts[1]);
        }
        catch (FormatException)
        {
            return false;
        }

        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
