namespace StickyNotes.Auth;

/// <summary>
/// Result of a registration attempt: a session token on success, or the validation
/// errors that blocked it (registration errors are explicit, unlike sign-in).
/// </summary>
public sealed record RegistrationOutcome(bool Succeeded, string? Token, IReadOnlyList<string> Errors)
{
    public static RegistrationOutcome Ok(string token) => new(true, token, []);

    public static RegistrationOutcome Rejected(params string[] errors) => new(false, null, errors);
}

/// <summary>
/// Result of a sign-in attempt. On failure no detail is carried — the caller
/// surfaces a single generic message so unknown-user and wrong-password are
/// indistinguishable (no user enumeration).
/// </summary>
public sealed record SignInOutcome(bool Succeeded, string? Token)
{
    public static SignInOutcome Ok(string token) => new(true, token);

    public static SignInOutcome Failed() => new(false, null);
}
