export type FilesTable = {
    file_id: number,
    parent_id: number | null,
    name: string,
    content_id: number,
    created_at: number,
    deleted_at: number
};

export type FoldersTable = {
    folder_id: number,
    parent_id: number | null,
    name: string,
    created_at: number,
    deleted_at: number
}

export type RevisionsTable = {
    revision_id: number,
    description: string,
    created_at: number
}

export type BlobsTable = {
  blob_id: number,
  compression: number,
  size_uncompressed: number,
  size_compressed: number,
  delta_base_id: number | null,
  hash: Buffer,
  content: Buffer
}