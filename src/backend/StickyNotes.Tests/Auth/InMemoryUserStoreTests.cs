using StickyNotes.Auth;

namespace StickyNotes.Tests.Auth;

public class InMemoryUserStoreTests
{
    private readonly InMemoryUserStore _store = new();

    [Fact]
    public void TryAdd_ReturnsTrueForANewUsername() =>
        Assert.True(_store.TryAdd(new User("ada", "hash")));

    [Fact]
    public void TryAdd_ReturnsFalseWhenTheUsernameAlreadyExists()
    {
        _store.TryAdd(new User("ada", "hash"));

        Assert.False(_store.TryAdd(new User("ada", "other-hash")));
    }

    [Fact]
    public void Find_ReturnsTheStoredUser()
    {
        _store.TryAdd(new User("ada", "hash"));

        Assert.Equal(new User("ada", "hash"), _store.Find("ada"));
    }

    [Fact]
    public void Find_ReturnsNullForAnUnknownUsername() =>
        Assert.Null(_store.Find("nobody"));
}
