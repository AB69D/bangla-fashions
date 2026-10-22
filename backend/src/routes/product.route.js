import { Router } from 'express'
import { backfillProductCodes, createProductController, deleteProductDetails, getProductByCategory, getProductController, getProductDetails, searchProduct, updateProductDetails, updateProductDiscount } from '../controllers/product.controller.js'
import { processAndUploadImages, productUpload } from '../middlewares/uploadImage.js'
import { requirePermission } from '../middlewares/auth.middleware.js'

const productRouter = Router()

// A coloured product has one variant per size per colour, so the per-variant
// photo fields have to reach further than the ten sizes they used to cover.
// Keep MAX_IMAGE_SIZES in the admin ProductImageManager equal to this.
const MAX_VARIANT_IMAGE_FIELDS = 30
// One photo field per colour (color_images_<index>). Equals MAX_COLORS in the
// product controller and the admin ProductColorsEditor.
const MAX_COLOR_IMAGE_FIELDS = 20

// Create and edit accept the same multipart fields: the cover photo, the
// product-level gallery, and up to ten photos per variant (weight_images_<index>) and per colour
// (color_images_<index>).
// Edit also accepts a plain JSON body — multer skips non-multipart requests.
const productImageFields = productUpload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'gallery_images', maxCount: 10 },
    ...Array.from({ length: MAX_VARIANT_IMAGE_FIELDS }, (_, i) => ({ name: `weight_images_${i}`, maxCount: 10 })),
    ...Array.from({ length: MAX_COLOR_IMAGE_FIELDS }, (_, i) => ({ name: `color_images_${i}`, maxCount: 10 }))
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
