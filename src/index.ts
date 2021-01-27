import type { Readable } from 'stream'
import * as file from './modules/file'
import * as collection from './modules/collection'
import * as tag from './modules/tag'
import * as pinning from './modules/pinning'
import * as bytes from './modules/bytes'
import * as pss from './modules/pss'
import * as connectivity from './modules/debug/connectivity'
import * as chunk from './modules/chunk'
import type {
  Tag,
  FileData,
  Reference,
  UploadOptions,
  PublicKey,
  AddressPrefix,
  Address,
  PssMessageHandler,
  PssSubscription,
  BeeResponse,
} from './types'
import { BeeError } from './utils/error'
import { EthAddress } from './chunk/signer'
import {
  Identifier,
  makeSingleOwnerChunk,
  makeSOCAddress,
  SOCReader,
  SOCWriter,
  verifySingleOwnerChunk,
} from './chunk/soc'
import { bytesToHex } from './utils/hex'
import { Signer } from './chunk/signer'
import { makeContentAddressedChunk } from './chunk/cac'
import { uploadChunk } from './chunk/upload'

/**
 * The Bee class provides a way of interacting with the Bee APIs based on the provided url
 *
 * @param url URL of a running Bee node
 */
export class Bee {
  constructor(readonly url: string) {}

  /**
   * Upload data to a Bee node
   *
   * @param data    Data to be uploaded
   * @param options Aditional options like tag, encryption, pinning, content-type
   *
   * @returns reference is a content hash of the data
   */
  uploadData(data: string | Uint8Array, options?: UploadOptions): Promise<Reference> {
    return bytes.upload(this.url, data, options)
  }

  /**
   * Download data as a byte array
   *
   * @param reference Bee data reference
   */
  downloadData(reference: Reference): Promise<Uint8Array> {
    return bytes.download(this.url, reference)
  }

  /**
   * Download data as a readable stream
   *
   * @param reference Bee data reference
   */
  downloadReadableData(reference: Reference): Promise<Readable> {
    return bytes.downloadReadable(this.url, reference)
  }

  /**
   * Upload single file to a Bee node
   *
   * @param data    Data to be uploaded
   * @param name    Name of the uploaded file
   * @param options Aditional options like tag, encryption, pinning, content-type
   *
   * @returns reference is a content hash of the file
   */
  uploadFile(
    data: string | Uint8Array | Readable,
    name?: string,
    options?: file.FileUploadOptions,
  ): Promise<Reference> {
    return file.upload(this.url, data, name, options)
  }

  /**
   * Download single file as a byte array
   *
   * @param reference Bee file reference
   */
  downloadFile(reference: Reference): Promise<FileData<Uint8Array>> {
    return file.download(this.url, reference)
  }

  /**
   * Download single file as a readable stream
   *
   * @param reference Bee file reference
   */
  downloadReadableFile(reference: Reference): Promise<FileData<Readable>> {
    return file.downloadReadable(this.url, reference)
  }

  /**
   * Upload collection of files to a Bee node
   *
   * Uses the FileList API from the browser.
   *
   * @param fileList list of files to be uploaded
   * @param options Additional options like tag, encryption, pinning
   *
   * @returns reference of the collection of files
   */
  async uploadFiles(fileList: FileList | File[], options?: collection.CollectionUploadOptions): Promise<Reference> {
    const data = await collection.buildFileListCollection(fileList)

    return collection.upload(this.url, data, options)
  }

  /**
   * Upload collection of files to a Bee node
   *
   * Uses the `fs` module of Node.js
   *
   * @param dir the path of the files to be uploaded
   * @param recursive specifies if the directory should be recursively uploaded
   * @param options Additional options like tag, encryption, pinning
   *
   * @returns reference of the collection of files
   */
  async uploadFilesFromDirectory(
    dir: string,
    recursive = true,
    options?: collection.CollectionUploadOptions,
  ): Promise<Reference> {
    const data = await collection.buildCollection(dir, recursive)

    return collection.upload(this.url, data, options)
  }

  /**
   * Download single file as a byte array from collection given using the path
   *
   * @param reference Bee collection reference
   * @param path Path of the requested file in the collection
   *
   * @returns file in byte array with metadata
   */
  downloadFileFromCollection(reference: Reference, path = ''): Promise<FileData<Uint8Array>> {
    return collection.download(this.url, reference, path)
  }

  /**
   * Download single file as a readable stream from collection given using the path
   *
   * @param reference Bee collection reference
   * @param path Path of the requested file in the collection
   *
   * @returns file in readable stream with metadata
   */
  downloadReadableFileFromCollection(reference: Reference, path = ''): Promise<FileData<Readable>> {
    return collection.downloadReadable(this.url, reference, path)
  }

  /**
   * Create new tag
   */
  createTag(): Promise<Tag> {
    return tag.createTag(this.url)
  }

  /**
   * Retrieve tag information from Bee node
   *
   * @param tag UID or tag object to be retrieved
   */
  retrieveTag(tagUid: number | Tag): Promise<Tag> {
    return tag.retrieveTag(this.url, tagUid)
  }

  /**
   * Pin file with given reference
   *
   * @param reference Bee file reference
   */
  pinFile(reference: Reference): Promise<BeeResponse> {
    return pinning.pinFile(this.url, reference)
  }

  /**
   * Unpin file with given reference
   *
   * @param reference Bee file reference
   */
  unpinFile(reference: Reference): Promise<BeeResponse> {
    return pinning.unpinFile(this.url, reference)
  }

  /**
   * Pin collection with given reference
   *
   * @param reference Bee collection reference
   */
  pinCollection(reference: Reference): Promise<BeeResponse> {
    return pinning.pinCollection(this.url, reference)
  }

  /**
   * Unpin collection with given reference
   *
   * @param reference Bee collection reference
   */
  unpinCollection(reference: Reference): Promise<BeeResponse> {
    return pinning.unpinCollection(this.url, reference)
  }

  /**
   * Pin data with given reference
   *
   * @param reference Bee data reference
   */
  pinData(reference: Reference): Promise<BeeResponse> {
    return pinning.pinData(this.url, reference)
  }

  /**
   * Unpin data with given reference
   *
   * @param reference Bee data reference
   */
  unpinData(reference: Reference): Promise<BeeResponse> {
    return pinning.unpinData(this.url, reference)
  }

  /**
   * Send to recipient or target with Postal Service for Swarm
   *
   * @param topic Topic name
   * @param target Target message address prefix
   * @param data Message to be sent
   * @param recipient Recipient public key
   *
   */
  pssSend(
    topic: string,
    target: AddressPrefix,
    data: string | Uint8Array,
    recipient?: PublicKey,
  ): Promise<BeeResponse> {
    return pss.send(this.url, topic, target, data, recipient)
  }

  /**
   * Subscribe to messages with Postal Service for Swarm
   *
   * @param topic Topic name
   * @param handler Message handler interface
   *
   * @returns Subscription to a given topic
   */
  pssSubscribe(topic: string, handler: PssMessageHandler): PssSubscription {
    const ws = pss.subscribe(this.url, topic)

    let cancelled = false
    const cancel = () => {
      if (cancelled === false) {
        cancelled = true
        // although the WebSocket API offers a `close` function, it seems that
        // with the library that we are using (isomorphic-ws) it doesn't close
        // the websocket properly, whereas `terminate` does
        ws.terminate()
      }
    }

    const subscription = {
      topic,
      cancel,
    }

    ws.onmessage = ev => {
      const data = new Uint8Array(Buffer.from(ev.data))

      // ignore empty messages
      if (data.length > 0) {
        handler.onMessage(data, subscription)
      }
    }
    ws.onerror = ev => {
      // ignore errors after subscription was cancelled
      if (!cancelled) {
        handler.onError(new BeeError(ev.message), subscription)
      }
    }

    return subscription
  }

  /**
   * Receive message with Postal Service for Swarm
   *
   * Because sending a PSS message is slow and CPU intensive,
   * it is not supposed to be used for general messaging but
   * most likely for setting up an encrypted communication
   * channel by sending a one-off message.
   *
   * This is a helper function to wait for exactly one message to
   * arrive and then cancel the subscription. Additionally a
   * timeout can be provided for the message to arrive or else
   * an error will be thrown.
   *
   * @param topic Topic name
   * @param timeoutMsec Timeout in milliseconds
   *
   * @returns Message in byte array
   */
  pssReceive(topic: string, timeoutMsec = 0): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      let timeout: number | undefined
      const subscription = this.pssSubscribe(topic, {
        onError: error => {
          clearTimeout(timeout)
          subscription.cancel()
          reject(error.message)
        },
        onMessage: message => {
          clearTimeout(timeout)
          subscription.cancel()
          resolve(message)
        },
      })

      if (timeoutMsec > 0) {
        // we need to cast the type because Typescript is getting confused with Node.js'
        // alternative type definitions
        timeout = (setTimeout(() => {
          subscription.cancel()
          reject(new BeeError('pssReceive timeout'))
        }, timeoutMsec) as unknown) as number
      }
    })
  }

  /**
   * Returns an object for reading single owner chunks
   *
   * @param ownerAddress The ethereum address of the owner
   */
  makeSOCReader(ownerAddress: EthAddress): SOCReader {
    const download = async (identifier: Identifier) => {
      const address = makeSOCAddress(identifier, ownerAddress)
      const data = await chunk.download(this.url, bytesToHex(address))

      return verifySingleOwnerChunk(data, address)
    }

    return {
      download,
    }
  }

  /**
   * Returns an object for reading and writing single owner chunks
   *
   * @param signer  The object for signing chunks
   */
  makeSOCWriter(signer: Signer): SOCWriter {
    const upload = async (identifier: Identifier, data: Uint8Array, options?: UploadOptions) => {
      const cac = makeContentAddressedChunk(data)
      const soc = await makeSingleOwnerChunk(cac, identifier, signer)

      return uploadChunk(this.url, soc, options)
    }

    return {
      ...this.makeSOCReader(signer.address),
      upload,
    }
  }
}

/**
 * The BeeDebug class provides a way of interacting with the Bee debug APIs based on the provided url
 *
 * @param url URL of a running Bee node
 */
export class BeeDebug {
  constructor(readonly url: string) {}

  async getOverlayAddress(): Promise<Address> {
    const nodeAddresses = await connectivity.getNodeAddresses(this.url)

    return nodeAddresses.overlay
  }

  async getPssPublicKey(): Promise<PublicKey> {
    const nodeAddresses = await connectivity.getNodeAddresses(this.url)

    return nodeAddresses.pss_public_key
  }
}
export default Bee
