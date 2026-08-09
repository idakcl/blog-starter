const demoCoverImages = [
  {
    id: "1497366754035-f200968a6e72",
    localPath: "/demo/desk.jpg",
  },
  {
    id: "1516321318423-f06f85e504b3",
    localPath: "/demo/notes.jpg",
  },
  {
    id: "1500530855697-b586d89ba3ee",
    localPath: "/demo/garden.jpg",
  },
  {
    id: "1499750310107-5fef28a66643",
    localPath: "/demo/writing.jpg",
  },
  {
    id: "1558494949-ef010cbdcc31",
    localPath: "/demo/server.jpg",
  },
] as const;

export function resolvePostCoverImage(coverImage: string) {
  const trimmed = coverImage.trim();

  if (!trimmed) {
    return "";
  }

  const demoImage = demoCoverImages.find((image) => trimmed.includes(image.id));

  return demoImage?.localPath ?? trimmed;
}
