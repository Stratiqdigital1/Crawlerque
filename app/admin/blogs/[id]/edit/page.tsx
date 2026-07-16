import BlogEditor from "@/components/admin/blog-editor";

type EditBlogPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditBlogPage({
  params,
}: EditBlogPageProps) {
  const { id } = await params;

  return (
    <BlogEditor
      mode="edit"
      postId={id}
    />
  );
}