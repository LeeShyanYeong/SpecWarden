using StickyNotes.Domain;

namespace StickyNotes.Tests;

public class InMemoryBoardStoreTests
{
    [Fact]
    public void NewStore_LoadsAnEmptyBoard()
    {
        var store = new InMemoryBoardStore();

        Assert.Empty(store.Load().Notes);
    }

    [Fact]
    public void Save_ThenLoad_ReturnsTheSavedNotes()
    {
        var store = new InMemoryBoardStore();
        var board = new Board
        {
            Notes =
            [
                new Note { Text = "A", X = 10, Y = 10 },
                new Note { Text = "B", X = 50, Y = 60 },
            ],
        };

        store.Save(board);

        Assert.Collection(
            store.Load().Notes,
            n => Assert.Equal(("A", 10d, 10d), (n.Text, n.X, n.Y)),
            n => Assert.Equal(("B", 50d, 60d), (n.Text, n.X, n.Y)));
    }

    [Fact]
    public void Save_ReplacesThePreviousBoardEntirely_LastWriteWins()
    {
        var store = new InMemoryBoardStore();
        store.Save(new Board { Notes = [new Note { Text = "A" }, new Note { Text = "B" }] });

        store.Save(new Board { Notes = [new Note { Text = "C" }] });

        var loaded = store.Load();
        Assert.Single(loaded.Notes);
        Assert.Equal("C", loaded.Notes[0].Text);
    }

    [Fact]
    public void SavingAnEmptyBoard_ClearsTheStoredNotes()
    {
        var store = new InMemoryBoardStore();
        store.Save(new Board { Notes = [new Note { Text = "A" }] });

        store.Save(Board.Empty);

        Assert.Empty(store.Load().Notes);
    }
}
