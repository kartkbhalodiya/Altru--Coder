{
  lib,
  stdenvNoCC,
  callPackage,
  bun,
  nodejs,
  sysctl,
  makeBinaryWrapper,
  models-dev,
  ripgrep,
  installShellFiles,
  versionCheckHook,
  writableTmpDirAsHomeHook,
  node_modules ? callPackage ./node-modules.nix { },
}:
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "altru-coder";
  inherit (node_modules) version src;
  inherit node_modules;

  nativeBuildInputs = [
    bun
    nodejs # for patchShebangs node_modules
    installShellFiles
    makeBinaryWrapper
    models-dev
    writableTmpDirAsHomeHook
  ];

  configurePhase = ''
    runHook preConfigure

    cp -R ${finalAttrs.node_modules}/. .
    patchShebangs node_modules
    patchShebangs packages/*/node_modules

    runHook postConfigure
  '';

  env.MODELS_DEV_API_JSON = "${models-dev}/dist/_api.json";
  env.ALTRU_CODER_DISABLE_MODELS_FETCH = true;
  env.ALTRU_CODER_VERSION = finalAttrs.version;
  env.ALTRU_CODER_CHANNEL = "local";

  buildPhase = ''
    runHook preBuild

    cd ./packages/opencode
    bun --bun ./script/build.ts --single --skip-install
    bun --bun ./script/schema.ts schema.json

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    install -Dm755 dist/@altru-coder/cli-*/bin/altru-coder $out/bin/altru-coder
    install -Dm644 schema.json $out/share/altru-coder/schema.json

    wrapProgram $out/bin/altru-coder \
      --prefix PATH : ${
        lib.makeBinPath (
          [
            ripgrep
          ]
          # bun runs sysctl to detect if running on rosetta2
          ++ lib.optional stdenvNoCC.hostPlatform.isDarwin sysctl
        )
      }

    runHook postInstall
  '';

  postInstall = lib.optionalString (stdenvNoCC.buildPlatform.canExecute stdenvNoCC.hostPlatform) ''
    # trick yargs into also generating zsh completions
    installShellCompletion --cmd altru-coder \
      --bash <($out/bin/altru-coder completion) \
      --zsh <(SHELL=/bin/zsh $out/bin/altru-coder completion)
  '';

  nativeInstallCheckInputs = [
    versionCheckHook
    writableTmpDirAsHomeHook
  ];
  doInstallCheck = true;
  versionCheckKeepEnvironment = [
    "HOME"
    "ALTRU_CODER_DISABLE_MODELS_FETCH"
  ];
  versionCheckProgramArg = "--version";

  passthru = {
    jsonschema = "${placeholder "out"}/share/altru-coder/schema.json";
  };

  meta = {
    description = "AI-powered development tool";
    homepage = "https://altru-coder.ai/";
    license = lib.licenses.mit;
    mainProgram = "altru-coder";
    inherit (node_modules.meta) platforms;
  };
})
