using StickyNotes.Auth;
using StickyNotes.Domain;

var builder = WebApplication.CreateBuilder(args);

// One shared global board (no accounts yet) -> the store is a singleton so its
// in-memory state is shared across all requests for the life of the server.
builder.Services.AddSingleton<IBoardStore, InMemoryBoardStore>();
builder.Services.AddSingleton<BoardValidator>();
builder.Services.AddSingleton<BoardService>();

// Authentication: accounts, password hashing, and bearer-token sessions. Singletons
// so the in-memory user/session state is shared for the life of the server.
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<IUserStore, InMemoryUserStore>();
builder.Services.AddSingleton<ISessionStore, SessionStore>();
builder.Services.AddSingleton<AuthService>();

var app = builder.Build();

// Serve the bundled Angular app from wwwroot so the API and UI ship as one unit
// on a single port. The build output is copied into wwwroot at compile time
// (scripts/stage-compile.sh) and baked into the published image by dotnet publish.
app.UseDefaultFiles();
app.UseStaticFiles();

// Board access requires a valid session; the board is scoped to the caller (its
// owner), so a user can only ever read or write their own board.
static IResult BoardUnauthenticated() =>
    Results.Json(new { error = "authentication required" }, statusCode: StatusCodes.Status401Unauthorized);

// Load the caller's saved board.
app.MapGet("/api/board", (HttpContext http, AuthService auth, BoardService boards) =>
{
    var owner = auth.Authenticate(http.BearerToken());
    return owner is null ? BoardUnauthenticated() : Results.Ok(boards.GetBoard(owner));
});

// Replace the caller's saved board in full; reject (without persisting) if invalid.
app.MapPut("/api/board", (Board board, HttpContext http, AuthService auth, BoardService boards) =>
{
    var owner = auth.Authenticate(http.BearerToken());
    if (owner is null)
    {
        return BoardUnauthenticated();
    }

    var outcome = boards.SaveBoard(owner, board);
    return outcome.Succeeded
        ? Results.Ok(boards.GetBoard(owner))
        : Results.BadRequest(new { errors = outcome.Errors });
});

// Authentication contract: register / login / logout / me (bearer-token sessions).
app.MapAuthEndpoints();

// Any non-API, non-file route is an Angular client-side route -> hand back the SPA shell.
app.MapFallbackToFile("index.html");

app.Run();
