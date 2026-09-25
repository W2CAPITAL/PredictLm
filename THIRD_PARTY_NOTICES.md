# Third-party notices

## Chat IA Engine

The normal-chat streaming architecture in PredictLM was adapted from ideas in:

- Repository: LeonardoFirme/chat_ia
- License: MIT
- Copyright (c) 2026 Leonardo Firme

The referenced project uses a direct chat flow with conversation history, server-side model calls and Server-Sent Events (SSE) streaming. PredictLM reimplements that architecture for its own Next.js multi-provider runtime rather than copying the original FastAPI/Prisma stack.

MIT License notice:

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, subject to the conditions of the original MIT License.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED.
