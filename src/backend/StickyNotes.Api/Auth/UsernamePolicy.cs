using System.Text.RegularExpressions;

namespace StickyNotes.Auth;

/// <summary>
/// Rules for usernames: case-insensitive identity, 3–30 characters drawn from
/// [a-z0-9_-]. <see cref="Normalize"/> is the canonical form used for both
/// uniqueness and sign-in lookup, so "Ada" and "ada" are the same account.
/// </summary>
public static partial class UsernamePolicy
{
    public const int MinLength = 3;
    public const int MaxLength = 30;

    /// <summary>Canonical form for storage and comparison: trimmed and lower-cased.</summary>
    public static string Normalize(string? username) =>
        (username ?? string.Empty).Trim().ToLowerInvariant();

    /// <summary>True when the normalized username is 3–30 chars of [a-z0-9_-].</summary>
    public static bool IsValid(string? username)
    {
        var normalized = Normalize(username);
        return normalized.Length is >= MinLength and <= MaxLength
            && AllowedPattern().IsMatch(normalized);
    }

    [GeneratedRegex("^[a-z0-9_-]+$")]
    private static partial Regex AllowedPattern();
}
