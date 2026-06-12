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

/**
 * Singleton cache for storing model capabilities.
 * Used to cache whether models support vision capabilities (JPEG images).
 */
export const ModelCapabilitiesCache = {
  cache: {} as Record<string, boolean>,

  /**
   * Retrieve the cached capability for a model.
   * @param model - The model identifier
   * @returns The cached capability value, or undefined if not cached
   */
  get(model: string): boolean | undefined {
    return this.cache[model];
  },

  /**
   * Store the capability for a model.
   * @param model - The model identifier
   * @param supportsVision - Whether the model supports vision capabilities
   */
  set(model: string, supportsVision: boolean): void {
    this.cache[model] = supportsVision;
  },

  /**
   * Check if a model's capability is cached.
   * @param model - The model identifier
   * @returns True if the model's capability is cached, false otherwise
   */
  has(model: string): boolean {
    return model in this.cache;
  },
};
