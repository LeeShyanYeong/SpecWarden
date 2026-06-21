namespace StickyNotes.Auth;

/// <summary>
/// A registered account: the canonical (normalized) username and the PBKDF2 hash
/// of its password. The plaintext password is never stored.
/// </summary>
public sealed record User(string Username, string PasswordHash);
