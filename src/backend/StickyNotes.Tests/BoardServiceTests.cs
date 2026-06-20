using StickyNotes.Domain;

namespace StickyNotes.Tests;

public class BoardServiceTests
{
    private static BoardService NewService(out IBoardStore store)
    {
        store = new InMemoryBoardStore();
        return new BoardService(store, new BoardValidator());
    }

    [Fact]
    public void SaveBoard_WithValidNotes_SucceedsAndPersists()
    {
        var service = NewService(out _);

        var outcome = service.SaveBoard(new Board { Notes = [new Note { Text = "hello" }] });

        Assert.True(outcome.Succeeded);
        Assert.Equal("hello", Assert.Single(service.GetBoard().Notes).Text);
    }

    [Fact]
    public void SaveBoard_WithNoteOver500Chars_IsRejectedAndLeavesStoredBoardUnchanged()
    {
        var service = NewService(out var store);
        store.Save(new Board { Notes = [new Note { Text = "original" }] });

        var outcome = service.SaveBoard(new Board { Notes = [new Note { Text = new string('a', 501) }] });

        Assert.False(outcome.Succeeded);
        Assert.NotEmpty(outcome.Errors);
        Assert.Equal("original", Assert.Single(service.GetBoard().Notes).Text);
    }
}
