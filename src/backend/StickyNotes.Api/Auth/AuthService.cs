namespace StickyNotes.Auth;

/// <summary>
/// Orchestrates authentication: self-serve registration, sign-in, sign-out, and
/// resolving a session token back to a user. Validation, hashing, storage, and
/// session lifetime live in the injected collaborators (ARCH-4: logic in services,
/// collaborators injected — the HTTP endpoints just translate to/from this).
/// </summary>
public sealed class AuthService(IUserStore users, PasswordHasher hasher, ISessionStore sessions)
{
    /// <summary>The single generic error for any failed sign-in (no user enumeration).</summary>
    public const string InvalidCredentialsMessage = "invalid username or password";

    public RegistrationOutcome Register(string username, string password)
    {
        var errors = new List<string>();
        if (!UsernamePolicy.IsValid(username))
        {
            errors.Add(
                $"Username must be {UsernamePolicy.MinLength}–{UsernamePolicy.MaxLength} " +
                "characters using letters, digits, hyphen or underscore.");
        }
        if (!PasswordPolicy.IsValid(password))
        {
            errors.Add($"Password must be at least {PasswordPolicy.MinLength} characters.");
        }
        if (errors.Count > 0)
        {
            return RegistrationOutcome.Rejected([.. errors]);
        }

        var user = new User(UsernamePolicy.Normalize(username), hasher.Hash(password));
        if (!users.TryAdd(user))
        {
            return RegistrationOutcome.Rejected("That username is already taken.");
        }

        return RegistrationOutcome.Ok(sessions.Issue(user.Username));
    }

    public SignInOutcome SignIn(string username, string password)
    {
        var user = users.Find(UsernamePolicy.Normalize(username));
        if (user is null || !hasher.Verify(password, user.PasswordHash))
        {
            return SignInOutcome.Failed();
        }

        return SignInOutcome.Ok(sessions.Issue(user.Username));
    }

    public void SignOut(string? token) => sessions.Invalidate(token);

    /// <summary>Resolves a session token to its username, or null if not authenticated.</summary>
    public string? Authenticate(string? token) => sessions.Validate(token);
}
