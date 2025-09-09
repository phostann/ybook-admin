import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, Image, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import TiptapEditor from '@/components/ui/tiptap-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { notesApi, uploadApi, NoteType, type NoteUpdateRequest } from '../api'
import { useNotesContext } from './notes-provider'

const noteFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().min(1, 'Content is required').max(50000, 'Content is too long'),
  type: z.nativeEnum(NoteType, { required_error: 'Please select a note type' }),
})

type NoteFormValues = z.infer<typeof noteFormSchema>

interface FilePreview {
  file: File
  url: string
}

interface ExistingMedia {
  url: string
  isExisting: true
}

type MediaItem = FilePreview | ExistingMedia

export function NotesEditDialog() {
  const { isEditDialogOpen, setIsEditDialogOpen, currentNote, refreshTable } = useNotesContext()
  const [isLoading, setIsLoading] = useState(false)
  const [imageFiles, setImageFiles] = useState<MediaItem[]>([])
  const [videoFile, setVideoFile] = useState<MediaItem | null>(null)
  const [videoPoster, setVideoPoster] = useState<string | null>(null)
  
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title: '',
      content: '',
      type: NoteType.IMAGE_TEXT,
    },
  })

  const watchedType = form.watch('type')

  // Load existing note data when dialog opens
  useEffect(() => {
    if (isEditDialogOpen && currentNote) {
      form.reset({
        title: currentNote.title,
        content: currentNote.content,
        type: currentNote.type,
      })

      // Load existing media
      if (currentNote.type === NoteType.IMAGE_TEXT && currentNote.images) {
        const imageUrls = currentNote.images.split(',').filter(url => url.trim())
        setImageFiles(imageUrls.map(url => ({ url: url.trim(), isExisting: true as const })))
      }

      if (currentNote.type === NoteType.VIDEO) {
        if (currentNote.video) {
          setVideoFile({ url: currentNote.video, isExisting: true })
        }
        if (currentNote.images) {
          setVideoPoster(currentNote.images)
        }
      }
    }
  }, [isEditDialogOpen, currentNote, form])

  const generateVideoPoster = async (videoFile: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(videoFile)
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = 0
      })
      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const posterUrl = URL.createObjectURL(blob)
            resolve(posterUrl)
          }
        }, 'image/jpeg', 0.8)
      })
    })
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const preview: FilePreview = {
          file,
          url: URL.createObjectURL(file)
        }
        setImageFiles(prev => [...prev, preview])
      }
    })
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('video/')) {
      const videoPreview: FilePreview = {
        file,
        url: URL.createObjectURL(file)
      }
      setVideoFile(videoPreview)
      
      try {
        const poster = await generateVideoPoster(file)
        setVideoPoster(poster)
      } catch (error) {
        console.error('Failed to generate video poster:', error)
      }
    }
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => {
      const newFiles = [...prev]
      const item = newFiles[index]
      if ('file' in item) {
        URL.revokeObjectURL(item.url)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const removeVideo = () => {
    if (videoFile && 'file' in videoFile) {
      URL.revokeObjectURL(videoFile.url)
    }
    setVideoFile(null)
    
    if (videoPoster && videoPoster.startsWith('blob:')) {
      URL.revokeObjectURL(videoPoster)
    }
    setVideoPoster(null)
  }

  const updateMutation = useMutation({
    mutationFn: async (data: NoteFormValues) => {
      if (!currentNote) throw new Error('No note to update')
      
      setIsLoading(true)
      
      // Upload new files
      let imageUrls: string[] = []
      let videoUrl = ''
      let posterUrl = ''

      if (data.type === NoteType.IMAGE_TEXT) {
        // Handle image files - keep existing ones and upload new ones
        const urlPromises = imageFiles.map(async (item) => {
          if ('file' in item) {
            const result = await uploadApi.upload(item.file)
            return result.data.url
          } else {
            return item.url
          }
        })
        imageUrls = await Promise.all(urlPromises)
      }

      if (data.type === NoteType.VIDEO) {
        // Handle video file
        if (videoFile) {
          if ('file' in videoFile) {
            const videoResult = await uploadApi.upload(videoFile.file)
            videoUrl = videoResult.data.url
          } else {
            videoUrl = videoFile.url
          }
        }
        
        // Handle video poster
        if (videoPoster) {
          if (videoPoster.startsWith('blob:')) {
            // New generated poster
            const response = await fetch(videoPoster)
            const blob = await response.blob()
            const posterFile = new File([blob], 'poster.jpg', { type: 'image/jpeg' })
            const posterResult = await uploadApi.upload(posterFile)
            posterUrl = posterResult.data.url
          } else {
            // Existing poster
            posterUrl = videoPoster
          }
        }
      }

      const noteData: NoteUpdateRequest = {
        title: data.title,
        content: data.content,
        type: data.type,
        images: data.type === NoteType.IMAGE_TEXT 
          ? imageUrls.join(',') 
          : posterUrl,
        video: data.type === NoteType.VIDEO ? videoUrl : undefined,
      }

      const result = await notesApi.update(currentNote.id, noteData)

      // TODO: 如果后端支持，这里可以添加标签关联的逻辑
      // const labelIds = extractLabelIdsFromHTML(data.content)
      // if (labelIds.length > 0) {
      //   await notesApi.updateLabels(currentNote.id, labelIds)
      // }

      return result
    },
    onSuccess: () => {
      toast.success('Note updated successfully')
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      refreshTable()
      // Force close dialog immediately without checking isLoading
      form.reset()
      imageFiles.forEach(file => {
        if ('file' in file) {
          URL.revokeObjectURL(file.url)
        }
      })
      setImageFiles([])
      if (videoFile && 'file' in videoFile) {
        URL.revokeObjectURL(videoFile.url)
      }
      setVideoFile(null)
      if (videoPoster && videoPoster.startsWith('blob:')) {
        URL.revokeObjectURL(videoPoster)
      }
      setVideoPoster(null)
      setIsEditDialogOpen(false)
    },
    onError: (error) => {
      console.error('Update note error:', error)
      toast.error('Failed to update note')
    },
    onSettled: () => {
      setIsLoading(false)
    },
  })

  const onSubmit = (data: NoteFormValues) => {
    // Validation based on note type
    if (data.type === NoteType.IMAGE_TEXT && imageFiles.length === 0) {
      toast.error('Please upload at least one image for Image & Text note')
      return
    }
    if (data.type === NoteType.VIDEO && !videoFile) {
      toast.error('Please upload a video for Video note')
      return
    }

    updateMutation.mutate(data)
  }

  const handleClose = () => {
    if (!isLoading) {
      form.reset()
      // Clean up file URLs
      imageFiles.forEach(file => {
        if ('file' in file) {
          URL.revokeObjectURL(file.url)
        }
      })
      setImageFiles([])
      if (videoFile && 'file' in videoFile) {
        URL.revokeObjectURL(videoFile.url)
      }
      setVideoFile(null)
      if (videoPoster && videoPoster.startsWith('blob:')) {
        URL.revokeObjectURL(videoPoster)
      }
      setVideoPoster(null)
      setIsEditDialogOpen(false)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && !isLoading) {
      handleClose()
    }
  }

  return (
    <Dialog open={isEditDialogOpen} onOpenChange={handleDialogClose}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
          <DialogDescription>
            Update your note content and media.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select note type' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NoteType.IMAGE_TEXT}>
                        <div className='flex items-center gap-2'>
                          <Image className='h-4 w-4' />
                          Image & Text
                        </div>
                      </SelectItem>
                      <SelectItem value={NoteType.VIDEO}>
                        <div className='flex items-center gap-2'>
                          <Video className='h-4 w-4' />
                          Video
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter note title...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='content'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <TiptapEditor
                      placeholder='Write your note content here... Use # to mention labels'
                      content={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    You can use markdown formatting and # to mention labels.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Media Upload Section */}
            {watchedType === NoteType.IMAGE_TEXT && (
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium mb-2'>
                    Images (Required - at least 1 image)
                  </label>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => imageInputRef.current?.click()}
                    className='w-full'
                  >
                    <Upload className='mr-2 h-4 w-4' />
                    Upload More Images
                  </Button>
                  <input
                    ref={imageInputRef}
                    type='file'
                    accept='image/*'
                    multiple
                    className='hidden'
                    onChange={handleImageSelect}
                  />
                </div>
                
                {imageFiles.length > 0 && (
                  <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
                    {imageFiles.map((file, index) => (
                      <div key={index} className='relative aspect-[3/4] group'>
                        <img
                          src={file.url}
                          alt={`Preview ${index + 1}`}
                          className='w-full h-full object-cover rounded-lg border shadow-sm group-hover:shadow-md transition-shadow'
                        />
                        <Button
                          type='button'
                          variant='destructive'
                          size='icon'
                          className='absolute -top-2 -right-2 h-6 w-6'
                          onClick={() => removeImage(index)}
                        >
                          <X className='h-3 w-3' />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {watchedType === NoteType.VIDEO && (
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium mb-2'>
                    Video (Required)
                  </label>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => videoInputRef.current?.click()}
                    className='w-full'
                  >
                    <Video className='mr-2 h-4 w-4' />
                    {videoFile ? 'Replace Video' : 'Upload Video'}
                  </Button>
                  <input
                    ref={videoInputRef}
                    type='file'
                    accept='video/*'
                    className='hidden'
                    onChange={handleVideoSelect}
                  />
                </div>
                
                {videoFile && (
                  <div className='relative'>
                    <video
                      src={videoFile.url}
                      controls
                      className='w-full max-h-48 rounded border'
                    />
                    <Button
                      type='button'
                      variant='destructive'
                      size='icon'
                      className='absolute -top-2 -right-2 h-6 w-6'
                      onClick={removeVideo}
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Note'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}