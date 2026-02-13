import { For, createSignal, Suspense, Show } from 'solid-js';
import { createForm } from '~/components/form/create_form';
import { z } from 'zod';
import {
  TextField,
  TextFieldLabel,
  TextFieldRoot,
} from '~/components/ui/textfield';
import { FieldArray, Form, FormError } from '~/components/form';
import {
  createCourse,
  updateCourse,
  fetchCourse,
  fetchCourses,
  deleteCourse,
} from '~/api/course';
import { LoadingButton } from '~/components/loading_button';
import { useQuery, useQueryClient, useMutation } from '@tanstack/solid-query';
import { COURSE_QUERY_KEY } from '~/api/query_keys';
import type { CourseState } from '~/state/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Button } from '~/components/ui/button';
import { Pencil, Trash2 } from '~/components/ui/icons';

const CreateCourseForm = (props: {
  onCreate: () => void;
  initialValues?: any;
  courseId?: number;
}) => {
  console.log(props.initialValues)
  const queryClient = useQueryClient();
  const { form, register, handleSubmit } = createForm({
    initialValues: props.initialValues || {
      name: '',
      tees: 'Mens',
      rating: 72.0,
      slope: 113,
      holes: Array.from({ length: 18 }, (_, i) => ({
        number: i + 1,
        par: 4,
        handicap: i + 1,
        yardage: 350,
      })),
    },
    schema: z.object({
      name: z.string().min(1, 'Name is required'),
      tees: z.string().min(1, 'Tees name is required'),
      rating: z.coerce.number().min(55).max(85, 'Rating must be between 55 and 85'),
      slope: z.coerce.number().min(55).max(155, 'Slope must be between 55 and 155'),
      holes: z.array(
        z.object({
          number: z.number(),
          par: z.coerce.number().min(3).max(6),
          handicap: z.coerce.number().min(1).max(18),
          yardage: z.coerce.number().min(1),
        }),
      ),
    }),
  });

  const onSubmit = async (values) => {
    try {
      if (props.courseId) {
        await updateCourse(props.courseId, values);
        queryClient.invalidateQueries({ queryKey: ['course', props.courseId] });
      } else {
        await createCourse(values);
        queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEY });
      }
      props.onCreate();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Form form={form}>
      <form onSubmit={handleSubmit(onSubmit)} class="space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <TextFieldRoot>
            <TextFieldLabel>Course Name</TextFieldLabel>
            <TextField {...register('name')} placeholder="e.g. Pebble Beach" />
          </TextFieldRoot>
          <TextFieldRoot>
            <TextFieldLabel>Tee Set</TextFieldLabel>
            <TextField {...register('tees')} placeholder="e.g. Mens" />
          </TextFieldRoot>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <TextFieldRoot>
            <TextFieldLabel>USGA Course Rating</TextFieldLabel>
            <TextField 
              type="number" 
              step="0.1"
              {...register('rating')} 
              placeholder="e.g. 72.0" 
            />
            <p class="text-xs text-gray-500 mt-1">
              Official USGA Course Rating (typically 67-77)
            </p>
          </TextFieldRoot>
          <TextFieldRoot>
            <TextFieldLabel>USGA Slope Rating</TextFieldLabel>
            <TextField 
              type="number" 
              {...register('slope')} 
              placeholder="e.g. 113" 
            />
            <p class="text-xs text-gray-500 mt-1">
              Official USGA Slope Rating (55-155, standard is 113)
            </p>
          </TextFieldRoot>
        </div>

        <div class="border rounded-md overflow-hidden">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-100 font-medium">
              <tr>
                <th class="px-4 py-2 w-16">Hole</th>
                <th class="px-4 py-2">Par</th>
                <th class="px-4 py-2">Handicap</th>
                <th class="px-4 py-2">Yardage</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <FieldArray name="holes">
                <For each={(form.values as any).holes}>
                  {(_, i) => (
                    <tr>
                      <td class="px-4 py-2 font-medium">{i() + 1}</td>
                      <td class="px-4 py-2">
                        <TextField
                          type="number"
                          {...register(`holes.${i()}.par`)}
                          class="w-full h-8"
                        />
                      </td>
                      <td class="px-4 py-2">
                        <TextField
                          type="number"
                          {...register(`holes.${i()}.handicap`)}
                          class="w-full h-8"
                        />
                      </td>
                      <td class="px-4 py-2">
                        <TextField
                          type="number"
                          {...register(`holes.${i()}.yardage`)}
                          class="w-full h-8"
                        />
                      </td>
                    </tr>
                  )}
                </For>
              </FieldArray>
            </tbody>
          </table>
        </div>

        <FormError />

        <div class="flex justify-end">
          <LoadingButton isLoading={() => form.submitting} type="submit">
            {props.courseId ? 'Update Course' : 'Create Course'}
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
};

const CoursesList = (props: { onEdit: (course: CourseState) => void }) => {
  const queryClient = useQueryClient();

  const coursesQuery = useQuery<CourseState[]>(() => ({
    queryKey: COURSE_QUERY_KEY,
    queryFn: fetchCourses,
    initialData: [],
  }));

  const deleteMutation = useMutation(() => ({
    mutationFn: (id: number) => deleteCourse(id).then(() => id),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['course', id] });
    },
  }));

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this course?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div class="bg-white rounded-lg shadow border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead class="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <For each={coursesQuery.data}>
            {(course) => (
              <TableRow>
                <TableCell>{course.id}</TableCell>
                <TableCell class="font-medium">{course.name}</TableCell>
                <TableCell>
                  <div class="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => props.onEdit(course)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(course.id)}
                      class="text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </For>
        </TableBody>
      </Table>
    </div>
  );
};

const EditCourseWrapper = (props: {
  courseId: number;
  onClose: () => void;
}) => {
  const courseQuery = useQuery(() => ({
    queryKey: ['course', props.courseId],
    queryFn: () => fetchCourse(props.courseId),
  }));

  return (
    <Show when={courseQuery.data} fallback={<div>Loading course...</div>}>
      {(course) => {
        const teeInfo = course().meta.tees[0] || { name: 'Mens', rating: 72.0, slope: 113 };
        const initialValues = {
          name: course().name,
          tees: teeInfo.name,
          rating: teeInfo.rating,
          slope: teeInfo.slope,
          holes: course().meta.holes.map((h) => ({
            number: h.number,
            par: h.par,
            handicap: h.handicap,
            yardage: h.yardage,
          })),
        };

        return (
          <div class="bg-white p-6 rounded-lg shadow border">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-semibold">Edit Course</h3>
              <Button variant="ghost" onClick={props.onClose}>
                Cancel
              </Button>
            </div>
            <CreateCourseForm
              onCreate={props.onClose}
              initialValues={initialValues}
              courseId={props.courseId}
            />
          </div>
        );
      }}
    </Show>
  );
};

const CoursesPanel = () => {
  const [tab, setTab] = createSignal<string>('edit');
  const [editingId, setEditingId] = createSignal<number | null>(null);

  const handleEdit = (course: CourseState) => {
    setEditingId(course.id);
    setTab('edit');
  };

  const handleCloseEdit = () => {
    setEditingId(null);
    setTab('edit');
  };

  const handleTabChange = (v: string) => {
    setTab(v);
    setEditingId(null);
  };

  return (
    <div class="p-4">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold">Courses</h2>
      </div>

      <Tabs value={tab()} onChange={handleTabChange}>
        <TabsList>
          <TabsTrigger class="z-5" value="edit">
            Edit
          </TabsTrigger>
          <TabsTrigger class="z-5" value="create">
            Create
          </TabsTrigger>
        </TabsList>

        <div class="mt-4">
          <Suspense fallback={<div>Loading...</div>}>
            <TabsContent value="edit">
              <CoursesList onEdit={handleEdit} />
              <Show when={editingId()}>
                <EditCourseWrapper
                  courseId={editingId()!}
                  onClose={handleCloseEdit}
                />
              </Show>
            </TabsContent>
            <TabsContent value="create">
              <div class="bg-white p-6 rounded-lg shadow border">
                <CreateCourseForm onCreate={() => setTab('edit')} />
              </div>
            </TabsContent>
          </Suspense>
        </div>
      </Tabs>
    </div>
  );
};

export default CoursesPanel;
