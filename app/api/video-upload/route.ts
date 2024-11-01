import { NextRequest, NextResponse } from 'next/server'; // Import Next.js request and response utilities
import { v2 as cloudinary } from 'cloudinary'; // Import Cloudinary v2 for uploading media
import { auth } from '@clerk/nextjs/server'; // Import Clerk for user authentication
import { PrismaClient } from '@prisma/client'; // Import Prisma for database operations

// Initialize Prisma client
const prisma = new PrismaClient()

// Cloudinary configuration using environment variables
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, // Cloudinary cloud name
    api_key: process.env.CLOUDINARY_API_KEY, // Cloudinary API key
    api_secret: process.env.CLOUDINARY_API_SECRET // Cloudinary API secret
});

// Define an interface for Cloudinary's upload result
interface CloudinaryUploadResult {
    public_id: string; // The public ID of the uploaded resource
    bytes: number; // The size of the uploaded file in bytes
    duration?: number; // (Optional) duration of the video
    [key: string]: any; // Any additional properties
}

// The POST function handles video upload requests
export async function POST(request: NextRequest) {

    try {
        // 1. Check if Cloudinary credentials are available in environment variables
        if (
            !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
        ) {
            // If any credential is missing, respond with a 500 error
            return NextResponse.json({ error: "Cloudinary credentials not found" }, { status: 500 });
        }

        // 2. Retrieve form data (file, title, description, originalSize) from the request
        const formData = await request.formData();
        const file = formData.get("file") as File | null; // Get the uploaded file
        const title = formData.get("title") as string; // Get the video title
        const description = formData.get("description") as string; // Get the video description
        const originalSize = formData.get("originalSize") as string; // Get the original size of the video

        // 3. Validate if the file was uploaded
        if (!file) {
            // If no file is found, return a 400 error
            return NextResponse.json({ error: "File not found" }, { status: 400 });
        }

        // 4. Convert the uploaded file into a Buffer for Cloudinary
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 5. Upload the video to Cloudinary using a stream
        const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: "video", // Specify that the resource type is a video
                    folder: "video-uploads", // Folder in Cloudinary where the video will be stored
                    transformation: [
                        { quality: "auto", fetch_format: "mp4" }, // Automatically adjust quality and convert to MP4 format
                    ]
                },
                (error, result) => {
                    // Handle the upload result
                    if (error) reject(error); // Reject the promise if there is an error
                    else resolve(result as CloudinaryUploadResult); // Resolve the promise with the Cloudinary result
                }
            );
            uploadStream.end(buffer); // Send the video buffer to Cloudinary via the upload stream
        });

        // 6. Save the video metadata in the database using Prisma
        const video = await prisma.video.create({
            data: {
                title, // Video title
                description, // Video description
                publicId: result.public_id, // Cloudinary public ID for the uploaded video
                originalSize: originalSize, // Original size of the uploaded video
                compressedSize: String(result.bytes), // Compressed size of the video after Cloudinary's processing
                duration: result.duration || 0, // Video duration (0 if not available)
            }
        });

        // 7. Return the video metadata as the response
        return NextResponse.json(video);

    } catch (error) {
        // 8. Handle any errors that occur during the upload or database operation
        console.log("Upload video failed", error);
        return NextResponse.json({ error: "Upload video failed" }, { status: 500 });

    } finally {
        // 9. Disconnect the Prisma client when done
        await prisma.$disconnect();
    }
}
