/*
 * Copyright Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface Config {
  aiNotebooks?: {
    /**
     * Enable or disable the AI Notebooks feature
     * When set to false, the feature will be hidden in the UI
     * @visibility frontend
     * @default true
     */
    enabled?: boolean;

    /**
     * Llama Stack configuration
     */
    llamaStack?: {
      /**
       * URL of the Llama Stack service
       * @visibility backend
       * @default http://0.0.0.0:8321
       */
      url?: string;

      /**
       * Embedding model ID (must be registered in Llama Stack)
       * @visibility backend
       * @default granite-embedding-125m-english
       */
      embeddingModel?: string;

      /**
       * Embedding dimension (must match the model)
       * @visibility backend
       * @default 768
       */
      embeddingDimension?: number;

      /**
       * Vector IO provider configuration
       */
      vectorIo?: {
        /**
         * Vector database provider ID
         * @visibility backend
         * @default milvus
         * @remarks Available providers: milvus (default), faiss (requires ENABLE_FAISS=true), pgvector, qdrant-remote, milvus-remote
         */
        providerId?: string;
      };
    };

    /**
     * Optional system prompt for notebook queries
     * @visibility backend
     */
    systemPrompt?: string;
  };
}
