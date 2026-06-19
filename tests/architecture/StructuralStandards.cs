using System.Text.RegularExpressions;

namespace Template.ArchitectureTests;

/// <summary>
/// Filesystem / project-shape standards from skills/arch-check/SKILL.md that are
/// about the repository's structure rather than type dependencies:
/// ARCH-1 (containerized executables), ARCH-2 (.NET backend), ARCH-3 (Angular
/// frontend). Each rule is dormant until the matching code exists, then activates
/// as a build-breaking guard — so the lane is green on a bare template.
/// </summary>
public class StructuralStandards
{
    // ARCH-1 — Executables are containerized.
    // Every runnable service project (ASP.NET Core Web SDK) ships a Dockerfile next to it.
    [Fact]
    public void Arch1_EveryExecutableServiceHasADockerfile()
    {
        var backend = RepoRoot.Resolve("src", "backend");
        if (!Directory.Exists(backend))
        {
            return; // No backend yet — rule is vacuously satisfied (activates once src/backend exists).
        }

        var missing = Directory
            .EnumerateFiles(backend, "*.csproj", SearchOption.AllDirectories)
            .Where(IsWebExecutable)
            .Where(proj => !File.Exists(Path.Combine(Path.GetDirectoryName(proj)!, "Dockerfile")))
            .ToList();

        Assert.True(
            missing.Count == 0,
            "ARCH-1: these executable services have no Dockerfile next to them:\n  " +
            string.Join("\n  ", missing));
    }

    // ARCH-2 — Backend is ASP.NET Core (.NET 10).
    [Fact]
    public void Arch2_BackendProjectsTargetDotNet10()
    {
        var backend = RepoRoot.Resolve("src", "backend");
        if (!Directory.Exists(backend))
        {
            return; // No backend yet — rule is vacuously satisfied (activates once src/backend exists).
        }

        var offenders = Directory
            .EnumerateFiles(backend, "*.csproj", SearchOption.AllDirectories)
            .Where(proj => !Regex.IsMatch(File.ReadAllText(proj), @"<TargetFramework>\s*net10\.0\s*</TargetFramework>"))
            .ToList();

        Assert.True(
            offenders.Count == 0,
            "ARCH-2: these backend projects do not target net10.0:\n  " +
            string.Join("\n  ", offenders));
    }

    // ARCH-3 — Frontend is Angular.
    // Activates automatically once src/frontend exists; until then there is nothing to guard.
    [Fact]
    public void Arch3_FrontendIsAngularWhenPresent()
    {
        var frontend = RepoRoot.Resolve("src", "frontend");
        if (!Directory.Exists(frontend))
        {
            return; // No frontend yet — rule is vacuously satisfied.
        }

        Assert.True(
            File.Exists(Path.Combine(frontend, "angular.json")),
            "ARCH-3: src/frontend exists but has no angular.json — it must be an Angular workspace.");
    }

    private static bool IsWebExecutable(string csprojPath)
    {
        var xml = File.ReadAllText(csprojPath);
        return xml.Contains("Microsoft.NET.Sdk.Web", StringComparison.OrdinalIgnoreCase)
            || xml.Contains("<OutputType>Exe</OutputType>", StringComparison.OrdinalIgnoreCase);
    }
}
