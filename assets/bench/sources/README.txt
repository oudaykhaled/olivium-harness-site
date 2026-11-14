Copies of the published benchmark files

The files in this folder are copies of files in the project repository,
https://github.com/oudaykhaled/olivium-harness, at the same relative paths
(bench/value/... and docs/benchmarks/...). Each copy is byte-identical to the
file on the repository's main branch.

In the repository files, absolute paths from the machine the benchmark ran on
are replaced with placeholders (see docs/benchmarks/PLACEHOLDERS.txt in the
repository). Nothing else is changed: every number, key and line is the same.

Placeholders
  the benchmark output folder in the home directory  ->  <bench-out>
  the API key file                                   ->  <key-file>
  the project checkout folder                        ->  <repo>

Redacted pre-registered protocol files

bench/value/PROTOCOL.md and bench/value/PROTOCOL-v2.md are pre-registered.
Their published copies, in the repository and here, are redacted: in each,
two paths in the benchmark output folder are replaced with <bench-out>/...
The SHA-256 of each unredacted original is kept on record below.

  bench/value/PROTOCOL.md
    replacements:    2 (<bench-out>)
    original:        14f9bfa57a397b45a74b9c0251d9dd80da854a4b81d79c444d8e3610f16075df
    published copy:  1a31ff4bfc4855794193921a58f709d03733591eee690cc9f0738547cec98efb

  bench/value/PROTOCOL-v2.md
    replacements:    2 (<bench-out>)
    original:        376b8a64d4f27708779564af85d1588cbc1a6e2063b1fc97b252e50363592719
    published copy:  f5551a50361714d4f98bb64174e6f4b499794ee2cdb2f15bd710996474b55efc

The SHA-256 recorded for PROTOCOL-v2.md in PROTOCOL-v2.sha256, in
docs/benchmarks/value-v2-2026-11-10-fix/provenance.json and in data.json
(376b8a64...) is the digest of the unredacted original, not of the published
copy.
