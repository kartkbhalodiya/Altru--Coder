@file:Suppress("UnstableApiUsage")

package ai.altrucoder.backend.rpc

import ai.altrucoder.rpc.AltruCoderAppRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class AltruCoderAppRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<AltruCoderAppRpcApi>()) {
            AltruCoderAppRpcApiImpl()
        }
    }
}
