import type { ProviderPreset } from './types'
import { NVIDIA_NIM_BASE_URL, NVIDIA_NIM_PROVIDER_ID, NVIDIA_NIM_PROVIDER_NAME, nvidiaNimModels } from '../nvidia-nim'

export const NvidiaNimPreset: ProviderPreset = {
    id: NVIDIA_NIM_PROVIDER_ID,
    name: NVIDIA_NIM_PROVIDER_NAME,
    baseURL: NVIDIA_NIM_BASE_URL,
    note: "Select NVIDIA NIM models from a built-in catalog fetched from NVIDIA's model endpoint.",
    fetch: false,
    models: nvidiaNimModels(),
  }

