//
//  ShareInboxConstants.swift
//  Shared between StrawNote and ShareExtension
//

import Foundation

enum ShareInboxConstants {
  static let appGroupId = "group.com.strawcoding.strawnote"
  static let workspaceModeFileName = "share-workspace-mode.json"
  static let inboxDirectoryName = "ShareInbox"
  static let attachmentsDirectoryName = "Attachments"
  static let invalidDirectoryName = "Invalid"
  static let stagingDirectoryName = "strawnote-share-inbox-staging"
  static let officialLinkPreviewURL = URL(
    string: "https://app.affine.pro/api/worker/link-preview"
  )!
  static let maxThumbnailBytes = 256 * 1024
  static let maxShareAttachmentBytes = 64 * 1024 * 1024
  static let stagingMaxAge: TimeInterval = 24 * 60 * 60
  static let openInboxURL = URL(string: "strawnote://share-inbox")!

  static var stagingDirectoryURL: URL {
    FileManager.default.temporaryDirectory
      .appendingPathComponent(stagingDirectoryName, isDirectory: true)
  }
}
