using StickyNotes.Domain;

namespace StickyNotes.Tests;

public class BoardServiceTests
{
    private const string Owner = "ada";

    private static BoardService NewService(out IBoardStore store)
    {
        store = new InMemoryBoardStore();
        return new BoardService(store, new BoardValidator());
    }

    [Fact]
    public void SaveBoard_WithValidNotes_SucceedsAndPersists()
    {
        var service = NewService(out _);

        var outcome = service.SaveBoard(Owner, new Board { Notes = [new Note { Text = "hello" }] });

        Assert.True(outcome.Succeeded);
        Assert.Equal("hello", Assert.Single(service.GetBoard(Owner).Notes).Text);
    }

    [Fact]
    public void SaveBoard_WithNoteOver500Chars_IsRejectedAndLeavesStoredBoardUnchanged()
    {
        var service = NewService(out var store);
        store.Save(Owner, new Board { Notes = [new Note { Text = "original" }] });

        var outcome = service.SaveBoard(Owner, new Board { Notes = [new Note { Text = new string('a', 501) }] });

        Assert.False(outcome.Succeeded);
        Assert.NotEmpty(outcome.Errors);
        Assert.Equal("original", Assert.Single(service.GetBoard(Owner).Notes).Text);
    }

    [Fact]
    public void SaveBoard_IsScopedToItsOwner()
    {
        var service = NewService(out _);

        service.SaveBoard("ann", new Board { Notes = [new Note { Text = "Ann's note" }] });

        Assert.Empty(service.GetBoard("bob").Notes);
        Assert.Equal("Ann's note", Assert.Single(service.GetBoard("ann").Notes).Text);
    }
}
