namespace StickyNotes.Auth;

/// <summary>
/// The auth REST contract: self-serve registration, sign-in, sign-out, and a
/// "who am I" probe. Endpoints stay thin — they translate HTTP to/from
/// <see cref="AuthService"/> and never hold auth logic themselves (ARCH-4).
///
/// The session credential is a bearer token: success responses carry { token },
/// and authenticated requests present it as "Authorization: Bearer &lt;token&gt;".
/// </summary>
public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        // Create an account; on success the user is signed in (a token is issued).
        app.MapPost("/api/auth/register", (RegisterRequest req, AuthService auth) =>
        {
            var outcome = auth.Register(req.Username, req.Password);
            return outcome.Succeeded
                ? Results.Ok(new { token = outcome.Token, username = UsernamePolicy.Normalize(req.Username) })
                : Results.BadRequest(new { errors = outcome.Errors });
        });

        // Sign in; failure is a single generic 401 (unknown user and wrong password alike).
        app.MapPost("/api/auth/login", (LoginRequest req, AuthService auth) =>
        {
            var outcome = auth.SignIn(req.Username, req.Password);
            return outcome.Succeeded
                ? Results.Ok(new { token = outcome.Token, username = UsernamePolicy.Normalize(req.Username) })
                : Unauthenticated();
        });

        // Sign out; idempotent — invalidates the presented token if there is one.
        app.MapPost("/api/auth/logout", (HttpContext http, AuthService auth) =>
        {
            auth.SignOut(http.BearerToken());
            return Results.Ok();
        });

        // Probe the current session: 200 with the username when authenticated, else 401.
        app.MapGet("/api/auth/me", (HttpContext http, AuthService auth) =>
        {
            var username = auth.Authenticate(http.BearerToken());
            return username is null ? Unauthenticated() : Results.Ok(new { username });
        });
    }

    private static IResult Unauthenticated() =>
        Results.Json(
            new { error = AuthService.InvalidCredentialsMessage },
            statusCode: StatusCodes.Status401Unauthorized);
}

/// <summary>Body of POST /api/auth/register.</summary>
public sealed record RegisterRequest(string Username, string Password);

/// <summary>Body of POST /api/auth/login.</summary>
public sealed record LoginRequest(string Username, string Password);
