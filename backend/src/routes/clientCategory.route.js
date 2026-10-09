import { Router } from 'express'
import { getStorefrontCategoryController } from '../controllers/category.controller.js'

const clientCategoryRouter = Router()

// Not the admin handler: this one hides the empty system "Other" category.
clientCategoryRouter.get('/get-all-category', getStorefrontCategoryController)

export default clientCategoryRouter
