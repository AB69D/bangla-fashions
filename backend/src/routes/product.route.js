import { Router } from 'express'
import { backfillProductCodes, createProductController, deleteProductDetails, getProductByCategory, getProductController, getProductDetails, searchProduct, updateProductDetails, updateProductDiscount } from '../controllers/product.controller.js'
import { processAndUploadImages, productUpload } from '../middlewares/uploadImage.js'
import { requirePermission } from '../middlewares/auth.middleware.js'

const productRouter = Router()

// Create and edit accept the same multipart fields: the cover photo, the
// product-level gallery, and up to ten photos per size (weight_images_<index>).
// Edit also accepts a plain JSON body — multer skips non-multipart requests.
const productImageFields = productUpload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 10 },
    { name: 'weight_images_0', maxCount: 10 },
    { name: 'weight_images_1', maxCount: 10 },
    { name: 'weight_images_2', maxCount: 10 },
    { name: 'weight_images_3', maxCount: 10 },
    { name: 'weight_images_4', maxCount: 10 },
    { name: 'weight_images_5', maxCount: 10 },
    { name: 'weight_images_6', maxCount: 10 },
    { name: 'weight_images_7', maxCount: 10 },
    { name: 'weight_images_8', maxCount: 10 },
    { name: 'weight_images_9', maxCount: 10 }
])

productRouter.post("/upload-product",
    requirePermission('product:write'),
    productImageFields,
    processAndUploadImages,
    createProductController
)

productRouter.post('/get-all-product', requirePermission('product:read'), getProductController)
productRouter.post("/get-product-by-category", requirePermission('product:read'), getProductByCategory)
productRouter.post('/get-product-details', requirePermission('product:read'), getProductDetails)

productRouter.put('/update-product-details',
    requirePermission('product:write'),
    productImageFields,
    processAndUploadImages,
    updateProductDetails
)

productRouter.delete('/delete-product', requirePermission('product:delete'), deleteProductDetails)

productRouter.post('/search-product', requirePermission('product:read'), searchProduct)
productRouter.post('/update-discount', requirePermission('product:write'), updateProductDiscount)

// One-time maintenance: generate scannable barcodes/SKUs for legacy products.
productRouter.post('/backfill-codes', requirePermission('product:write'), backfillProductCodes)

export default productRouter
