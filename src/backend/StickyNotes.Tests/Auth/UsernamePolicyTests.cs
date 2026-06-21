using StickyNotes.Auth;

namespace StickyNotes.Tests.Auth;

public class UsernamePolicyTests
{
    [Theory]
    [InlineData("ada")]
    [InlineData("Ada")]            // normalized to lowercase
    [InlineData("a_b-c")]
    [InlineData("user123")]
    [InlineData("  ada  ")]        // trimmed
    [InlineData("abc")]            // exactly 3
    public void IsValid_AcceptsWellFormedUsernames(string username) =>
        Assert.True(UsernamePolicy.IsValid(username));

    [Theory]
    [InlineData("ab")]             // shorter than 3
    [InlineData("this-username-is-far-too-long-abc")] // longer than 30
    [InlineData("bad@name")]       // illegal character
    [InlineData("has space")]
    [InlineData("")]
    [InlineData(null)]
    public void IsValid_RejectsMalformedUsernames(string? username) =>
        Assert.False(UsernamePolicy.IsValid(username));

    [Theory]
    [InlineData("Ada", "ada")]
    [InlineData("  ADA ", "ada")]
    [InlineData("ada", "ada")]
    public void Normalize_TrimsAndLowercases(string input, string expected) =>
        Assert.Equal(expected, UsernamePolicy.Normalize(input));
}
