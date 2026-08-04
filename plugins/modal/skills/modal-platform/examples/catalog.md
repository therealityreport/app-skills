# Modal Examples Catalog

Source of truth: `https://modal.com/docs/examples`.

Use this catalog to choose an official example family before drafting or editing project code. It is an index, not copied docs.

## Start Here
- [Featured examples index](https://modal.com/docs/examples)
- [Hello, world](https://modal.com/docs/examples/hello_world.md)
- [Simple web scraper](https://modal.com/docs/examples/webscraper.md)
- [Serving Web Functions](https://modal.com/docs/examples/basic_web.md)
- [Miscellaneous examples](https://modal.com/docs/examples/miscellaneous)
- [`modal-labs/modal-examples`](https://github.com/modal-labs/modal-examples) - runnable repository examples; use after official docs to inspect project shape or file organization.

## Large Language Models, RAG, And MCP
- [Deploy an OpenAI-compatible LLM service with vLLM](https://modal.com/docs/examples/llm_inference.md)
- [Deploy really big language models](https://modal.com/docs/examples/very_large_models)
- [Cut Ministral 3 cold start times by 10x with snapshots](https://modal.com/docs/examples/ministral3_inference.md)
- [Maximize tokens per second in batch processing with vLLM](https://modal.com/docs/examples/vllm_throughput.md)
- [Serve an ultra-low-latency chatbot with SGLang](https://modal.com/docs/examples/sglang_low_latency.md)
- [Efficient LLM Finetuning with Unsloth](https://modal.com/docs/examples/unsloth_finetune.md)
- [Run a multimodal RAG chatbot to answer questions about PDFs](https://modal.com/docs/examples/chat_with_pdf_vision.md)
- [Fine-tune an LLM](https://modal.com/docs/examples/llm-finetuning.md)
- [Deploy a stateless MCP with FastMCP](https://modal.com/docs/examples/mcp_server_stateless.md)

## Image, Video, Audio, And Realtime Media
- [Edit images with Flux Kontext](https://modal.com/docs/examples/image_to_image.md)
- [Fine-tune Wan2.1 video models](https://modal.com/docs/examples/music-video-gen.md)
- [Run Flux fast with torch.compile](https://modal.com/docs/examples/flux.md)
- [Fine-tune Flux with LoRA](https://modal.com/docs/examples/diffusers_lora_finetune.md)
- [Animate images with LTX-Video](https://modal.com/docs/examples/image_to_video.md)
- [Generate video clips with LTX-Video](https://modal.com/docs/examples/ltx.md)
- [Run Stable Diffusion with a CLI, API, and web UI](https://modal.com/docs/examples/text_to_image.md)
- [Deploy a Moshi voice chatbot](https://modal.com/docs/examples/llm-voice-chat.md)
- [Stream transcripts with Kyutai STT](https://modal.com/docs/examples/streaming_kyutai_stt.md)
- [Make music with ACE-Step](https://modal.com/docs/examples/generate_music.md)
- [Generate speech with Chatterbox](https://modal.com/docs/examples/chatterbox_tts.md)
- [Run high throughput batched transcription with Whisper](https://modal.com/docs/examples/batched_whisper.md)
- [Fine-tune Whisper to recognize new words](https://modal.com/docs/examples/fine_tune_asr.md)
- [Serverless WebRTC](https://modal.com/docs/examples/webrtc_yolo.md)
- [WebRTC quickstart with FastRTC](https://modal.com/docs/examples/fastrtc_flip_webcam.md)

## Agents And Sandboxes
- [Run a background coding agent with OpenCode](https://modal.com/docs/examples/opencode_server.md)
- [Build a scalable AI coding platform](https://modal.com/docs/examples/modal-vibe.md)
- [Create GIFs from Slack using the Claude Agent SDK](https://modal.com/docs/examples/claude-slack-gif-creator.md)
- [Run a LangGraph agent's code in a secure GPU sandbox](https://modal.com/docs/examples/agent.md)
- [Control a sandboxed computer with an LLM](https://modal.com/docs/examples/anthropic_computer_use.md)
- [Build a stateful, sandboxed code interpreter](https://modal.com/docs/examples/simple_code_interpreter.md)
- [Run Node.js, Ruby, and more in a Sandbox](https://modal.com/docs/examples/safe_code_execution.md)
- [Speed up Sandbox starts with warm pools](https://modal.com/docs/examples/sandbox_pool.md)

## Training, Reinforcement Learning, Vision, And Science
- [Train a model to solve math problems using GRPO and verl](https://modal.com/docs/examples/grpo_verl.md)
- [Train a model to solve coding problems using GRPO and TRL](https://modal.com/docs/examples/grpo_trl.md)
- [Train an SLM with early-stopping hyperparameter search](https://modal.com/docs/examples/hp_sweep_gpt.md)
- [Run long, resumable training jobs](https://modal.com/docs/examples/long-training.md)
- [YOLO: Fine-tune and serve computer vision models](https://modal.com/docs/examples/finetune_yolo.md)
- [Fold proteins with Chai-1](https://modal.com/docs/examples/chai1.md)
- [Build a protein-folding dashboard](https://modal.com/docs/examples/esm3.md)
- [Fold proteins with Boltz-2](https://modal.com/docs/examples/boltz_predict.md)

## Data, Search, Queues, Storage, And Pipelines
- [Embed millions of documents with TEI](https://modal.com/docs/examples/amazon_embeddings.md)
- [Turn satellite images into vectors and store them in MongoDB](https://modal.com/docs/examples/mongodb-search.md)
- [Deploy a Hacker News Slackbot](https://modal.com/docs/examples/hackernews_alerts.md)
- [Run a Document OCR job queue](https://modal.com/docs/examples/doc_ocr_jobs.md)
- [Serve a Document OCR web app](https://modal.com/docs/examples/doc_ocr_webapp.md)
- [SQLite: Publish explorable data with Datasette](https://modal.com/docs/examples/cron_datasette.md)
- [Algolia: Build docsearch with a crawler](https://modal.com/docs/examples/algolia_indexer.md)
- [Google Sheets: Sync databases and APIs to a Google Sheet](https://modal.com/docs/examples/db_to_sheet.md)
- [OpenAI: Run a RAG Q&A chatbot](https://modal.com/docs/examples/potus_speech_qanda.md)
- [Mount S3 buckets in Modal apps](https://modal.com/docs/examples/s3_bucket_mount.md)
- [Build your own data warehouse with DuckDB, DBT, and Modal](https://modal.com/docs/examples/dbt_duckdb.md)
- [Create a LoRA Playground with Modal, Gradio, and S3](https://modal.com/docs/examples/cloud_bucket_mount_loras.md)

## Apps, Bots, Infrastructure, And Observability
- [Blender: Build a 3D render farm](https://modal.com/docs/examples/blender_video.md)
- [Streamlit: Run and deploy Streamlit apps](https://modal.com/docs/examples/serve_streamlit.md)
- [Discord: Deploy and run a Discord Bot](https://modal.com/docs/examples/discord_bot.md)
- [Tailscale: Add Modal Apps to your VPN](https://modal.com/docs/examples/modal_tailscale.md)
- [Prometheus: Publish custom metrics with Pushgateway](https://modal.com/docs/examples/pushgateway.md)

## Repository-Derived Discovery
- [`modal-labs/awesome-modal`](https://github.com/modal-labs/awesome-modal) - community project discovery; treat as pattern scouting, not official support.
- [`modal-labs/modal-client`](https://github.com/modal-labs/modal-client) - SDK source and setup context; use official docs for public contracts.
- [`modal-labs/vprox`](https://github.com/modal-labs/vprox) - split tunnel VPN, static egress, and OIDC networking patterns.
- [`modal-labs/modal-vibe`](https://github.com/modal-labs/modal-vibe) - AI coding platform pattern using Modal Sandboxes and Tunnels.
- [`modal-labs/open-batch-transcription`](https://github.com/modal-labs/open-batch-transcription) - batch ASR with GPU batching and Modal Volumes.
- [`modal-labs/multinode-training-guide`](https://github.com/modal-labs/multinode-training-guide) - early-preview distributed training examples.
- [`modal-labs/ci-on-modal`](https://github.com/modal-labs/ci-on-modal) - remote test and CI runner pattern.
- [`modal-labs/biomodals`](https://github.com/modal-labs/biomodals) - bioinformatics and scientific compute examples.
- [`modal-labs/search-california`](https://github.com/modal-labs/search-california) - geospatial/vector search full-stack app pattern.
- [`modal-labs/networking-demos`](https://github.com/modal-labs/networking-demos) - examples for connecting to Modal containers.
