# ARCH-1: this service ships a container definition. Build context is this project
# directory (see scripts/stage-deploy.sh), so all source lives under it.
#
# The Angular app is bundled in via wwwroot/, which scripts/stage-compile.sh
# populates from the frontend build before this image is built. dotnet publish
# (Web SDK) bakes wwwroot into the output, so the single image serves both the
# REST API and the SPA on port 8080.

# --- build stage ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY StickyNotes.Api.csproj ./
RUN dotnet restore StickyNotes.Api.csproj
COPY . ./
RUN dotnet publish StickyNotes.Api.csproj -c Release -o /app --no-restore

# --- runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "StickyNotes.Api.dll"]
