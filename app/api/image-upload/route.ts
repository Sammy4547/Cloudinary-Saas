import { NextRequest, NextResponse } from 'next/server'; // Import necessary modules for handling requests and responses in Next.js
import { v2 as cloudinary } from 'cloudinary'; // Import Cloudinary library for image uploading
import { auth } from '@clerk/nextjs/server'; // Import authentication method from Clerk

// Cloudinary Configuration
cloudinary.config({
    // Set up Cloudinary with your account credentials from environment variables
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View Credentials' below to copy your API secret
});

// Interface to define the expected structure of the Cloudinary upload result
interface CloudinaryUploadResult {
    public_id: string; // ID of the uploaded image
    [key: string]: any; // Allow any other properties in the result
}

// Function to handle POST requests for image uploads
export async function POST(request: NextRequest) {
    // Authenticate the user and get their userId
    const { userId } = auth();

    // Check if the user is authenticated
    if (!userId) {
        // Return a 401 Unauthorized response if not authenticated
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Parse the form data from the request
        const formData = await request.formData();
        // Get the file from the form data
        const file = formData.get("file") as File | null;

        // Check if a file was provided
        if (!file) {
            // Return a 400 Bad Request response if no file was found
            return NextResponse.json({ error: "File not found" }, { status: 400 });
        }

        // Read the file as an ArrayBuffer
        const bytes = await file.arrayBuffer();
        // Convert the ArrayBuffer into a Buffer for uploading
        const buffer = Buffer.from(bytes);

        // Create a promise to handle the asynchronous upload to Cloudinary
        const result = await new Promise<CloudinaryUploadResult>(
            (resolve, reject) => {
                // Create a stream to upload the file to Cloudinary
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "next-cloudinary-uploads" }, // Specify the folder to upload to
                    (error, result) => {
                        // Check for errors during the upload
                        if (error) reject(error); // Reject the promise with the error
                        else resolve(result as CloudinaryUploadResult); // Resolve the promise with the result
                    }
                );
                // End the stream with the file buffer
                uploadStream.end(buffer);
            }
        );

        // Return the public ID of the uploaded image in the response
        return NextResponse.json(
            {
                publicId: result.public_id // Send back the public ID
            },
            {
                status: 200 // HTTP status code for a successful request
            }
        );

    } catch (error) {
        // Log any errors that occur during the upload process
        console.log("Upload image failed", error);
        // Return a 500 Internal Server Error response if an exception was thrown
        return NextResponse.json({ error: "Upload image failed" }, { status: 500 });
    }
}
