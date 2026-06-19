namespace Template.ArchitectureTests;

/// <summary>
/// Locates the repository root from the test's runtime directory so the
/// filesystem-level standards (ARCH-1/2/3) can inspect the real tree rather
/// than hard-coded absolute paths.
/// </summary>
internal static class RepoRoot
{
    /// <summary>Absolute path to the repo root (the directory containing AGENTS.md).</summary>
    public static string Path { get; } = Find();

    private static string Find()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(System.IO.Path.Combine(dir.FullName, "AGENTS.md")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException(
            "Could not locate the repository root (no AGENTS.md found above " +
            $"'{AppContext.BaseDirectory}').");
    }

    /// <summary>Resolves a path relative to the repo root.</summary>
    public static string Resolve(params string[] segments) =>
        System.IO.Path.Combine(new[] { Path }.Concat(segments).ToArray());
}
