# jup-sh

Risk and settlement for Solana agent payments.

This package is an alpha packaging prototype for the `jup-sh` CLI.

Current alpha status:

- quote-only
- local intent only
- local policy checks
- Risk Review export
- no wallet signing
- no swap execution
- no custody

The current wrapper is intended for repository-based alpha testing. It expects
the Rust workspace to be available and shells out to:

```bash
cargo run --quiet --
```

Target command shape:

```bash
jup-sh pay --agent claude --token SOL --settle 20 USDC --json
```

The CLI JSON contract is documented in:

```txt
docs/cli-json-contract.md
```

Project:

```txt
https://www.jup.sh
https://github.com/jerrywang33/jup-sh
```
