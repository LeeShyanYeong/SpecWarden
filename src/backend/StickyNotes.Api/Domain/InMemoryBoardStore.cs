using System.Collections.Concurrent;

namespace StickyNotes.Domain;

/// <summary>
/// Holds each owner's board in memory for the lifetime of the running server.
/// Survives browser reloads (state lives server-side); a server restart resets it
/// — durable storage is a later story. Saves are last-write-wins, per owner.
/// </summary>
public sealed class InMemoryBoardStore : IBoardStore
{
    private readonly ConcurrentDictionary<string, Board> _boards = new();

    public Board Load(string owner) =>
        _boards.TryGetValue(owner, out var board) ? board : Board.Empty;

    public void Save(string owner, Board board) => _boards[owner] = board;
}
