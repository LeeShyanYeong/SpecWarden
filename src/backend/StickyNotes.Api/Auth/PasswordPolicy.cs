namespace StickyNotes.Auth;

/// <summary>
/// Rules for passwords. Only a minimum length is enforced — no complexity rules
/// and no upper cap, by decision (spec-task brainstorm).
/// </summary>
public static class PasswordPolicy
{
    public const int MinLength = 8;

    public static bool IsValid(string? password) =>
        (password ?? string.Empty).Length >= MinLength;
}
