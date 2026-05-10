import { createContext, createSignal, onCleanup, useContext, type Accessor, type ParentComponent } from "solid-js"
import {
  EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG,
  type AltruCoderEmbeddingModelCatalog,
} from "@altru-coder/altru-coder-indexing/embedding-models"
import { useVSCode } from "./vscode"
import type { ExtensionMessage } from "../types/messages"

type AltruCoderEmbeddingModelsContextValue = {
  catalog: Accessor<AltruCoderEmbeddingModelCatalog>
}

export const AltruCoderEmbeddingModelsContext = createContext<AltruCoderEmbeddingModelsContextValue>()

export const AltruCoderEmbeddingModelsProvider: ParentComponent = (props) => {
  const vscode = useVSCode()
  const [catalog, setCatalog] = createSignal<AltruCoderEmbeddingModelCatalog>(EMPTY_ALTRU_CODER_EMBEDDING_MODEL_CATALOG)

  const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
    if (message.type !== "altruEmbeddingModelsLoaded") return
    setCatalog(message.catalog)
  })

  vscode.postMessage({ type: "requestAltruCoderEmbeddingModels" })

  onCleanup(unsubscribe)

  return (
    <AltruCoderEmbeddingModelsContext.Provider value={{ catalog }}>
      {props.children}
    </AltruCoderEmbeddingModelsContext.Provider>
  )
}

export function useAltruCoderEmbeddingModels(): AltruCoderEmbeddingModelsContextValue {
  const context = useContext(AltruCoderEmbeddingModelsContext)
  if (!context) {
    throw new Error("useAltruCoderEmbeddingModels must be used within a AltruCoderEmbeddingModelsProvider")
  }
  return context
}
