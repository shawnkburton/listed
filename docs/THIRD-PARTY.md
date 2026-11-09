# Photo conversion dependency

HEIC fallback decoding uses [heic-to 1.5.2](https://github.com/hoppergee/heic-to), pinned in package.json and the lockfile. Its package includes libheif-based browser decoding, and its LGPL-3.0 license is retained at public/third-party/heic-to-LICENSE.txt. The module is loaded locally only when native decoding of a HEIC file fails; it does not send photographs to a converter service. Source and build instructions are available from the linked upstream repository.
