@file:Suppress("UnstableApiUsage")

package ai.altrucoder.backend.rpc

import ai.altrucoder.rpc.AltruCoderSessionRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class AltruCoderSessionRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<AltruCoderSessionRpcApi>()) {
            AltruCoderSessionRpcApiImpl()
        }
    }
}
