@file:Suppress("UnstableApiUsage")

package ai.altrucoder.backend.rpc

import ai.altrucoder.rpc.AltruCoderWorkspaceRpcApi
import com.intellij.platform.rpc.backend.RemoteApiProvider
import fleet.rpc.remoteApiDescriptor

internal class AltruCoderProjectRpcApiProvider : RemoteApiProvider {
    override fun RemoteApiProvider.Sink.remoteApis() {
        remoteApi(remoteApiDescriptor<AltruCoderWorkspaceRpcApi>()) {
            AltruCoderWorkspaceRpcApiImpl()
        }
    }
}
