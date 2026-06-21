using StickyNotes.Domain;

namespace StickyNotes.Tests;

public class InMemoryBoardStoreTests
{
    private const string Owner = "ada";

    [Fact]
    public void NewStore_LoadsAnEmptyBoardForAnyOwner()
    {
        var store = new InMemoryBoardStore();

        Assert.Empty(store.Load(Owner).Notes);
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

        store.Save(Owner, board);

        Assert.Collection(
            store.Load(Owner).Notes,
            n => Assert.Equal(("A", 10d, 10d), (n.Text, n.X, n.Y)),
            n => Assert.Equal(("B", 50d, 60d), (n.Text, n.X, n.Y)));
    }

    [Fact]
    public void Save_ReplacesThePreviousBoardEntirely_LastWriteWins()
    {
        var store = new InMemoryBoardStore();
        store.Save(Owner, new Board { Notes = [new Note { Text = "A" }, new Note { Text = "B" }] });

        store.Save(Owner, new Board { Notes = [new Note { Text = "C" }] });

        var loaded = store.Load(Owner);
        Assert.Single(loaded.Notes);
        Assert.Equal("C", loaded.Notes[0].Text);
    }

    [Fact]
    public void SavingAnEmptyBoard_ClearsTheStoredNotes()
    {
        var store = new InMemoryBoardStore();
        store.Save(Owner, new Board { Notes = [new Note { Text = "A" }] });

        store.Save(Owner, Board.Empty);

        Assert.Empty(store.Load(Owner).Notes);
    }

    [Fact]
    public void EachOwnerHasAnIsolatedBoard()
    {
        var store = new InMemoryBoardStore();
        store.Save("ann", new Board { Notes = [new Note { Text = "Ann's note" }] });
        store.Save("bob", new Board { Notes = [new Note { Text = "Bob's note" }] });

        Assert.Equal("Ann's note", Assert.Single(store.Load("ann").Notes).Text);
        Assert.Equal("Bob's note", Assert.Single(store.Load("bob").Notes).Text);
    }
}
