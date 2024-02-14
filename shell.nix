{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  buildInputs = [

    pkgs.nodejs_18
    pkgs.just
  ];

  shellHook = ''
    just install
    just build
    echo "Installed and built"
    echo "Type 'just run 0' to run the first generation"
  '';
}
