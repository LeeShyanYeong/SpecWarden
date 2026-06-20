using StickyNotes.Domain;

var builder = WebApplication.CreateBuilder(args);

// One shared global board (no accounts yet) -> the store is a singleton so its
// in-memory state is shared across all requests for the life of the server.
builder.Services.AddSingleton<IBoardStore, InMemoryBoardStore>();
builder.Services.AddSingleton<BoardValidator>();
builder.Services.AddSingleton<BoardService>();

var app = builder.Build();

// Serve the bundled Angular app from wwwroot so the API and UI ship as one unit
// on a single port. The build output is copied into wwwroot at compile time
// (scripts/stage-compile.sh) and baked into the published image by dotnet publish.
app.UseDefaultFiles();
app.UseStaticFiles();

// Load the saved board.
app.MapGet("/api/board", (BoardService boards) => Results.Ok(boards.GetBoard()));

// Replace the saved board in full; reject (without persisting) if any note is invalid.
app.MapPut("/api/board", (Board board, BoardService boards) =>
{
    var outcome = boards.SaveBoard(board);
    return outcome.Succeeded
        ? Results.Ok(boards.GetBoard())
        : Results.BadRequest(new { errors = outcome.Errors });
});

// Any non-API, non-file route is an Angular client-side route -> hand back the SPA shell.
app.MapFallbackToFile("index.html");

app.Run();
