-- Allow reference links alongside match links
ALTER TABLE frame_links DROP CONSTRAINT frame_links_link_type_check;
ALTER TABLE frame_links ADD CONSTRAINT frame_links_link_type_check
  CHECK (link_type IN ('match', 'reference'));

-- One link per target frame (match OR reference, not both)
ALTER TABLE frame_links DROP CONSTRAINT frame_links_target_frame_id_link_type_key;
ALTER TABLE frame_links ADD CONSTRAINT frame_links_target_frame_id_key UNIQUE(target_frame_id);
