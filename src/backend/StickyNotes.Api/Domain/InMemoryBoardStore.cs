namespace StickyNotes.Domain;

/// <summary>
/// Holds the shared board in memory for the lifetime of the running server.
/// Survives browser reloads (the state lives server-side); a server restart
/// resets it — durable storage is a later story. Saves are last-write-wins.
/// </summary>
public sealed class InMemoryBoardStore : IBoardStore
{
    private readonly Lock _gate = new();
    private Board _board = Board.Empty;

    public Board Load()
    {
        lock (_gate)
        {
            return _board;
        }
    }

    public void Save(Board board)
    {
        lock (_gate)
        {
            _board = board;
        }
    }
}
