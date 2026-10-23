import { TemplateType, TemplateInput } from "@/types/product";

const BASE_DEFAULTS = {
  productName: "",
  description: "",
  specifications: [{ key: "", value: "" }],
  targetAudience: "",
  keySellingPoints: ["", "", ""],
  uploadedImages: [],
  problemStatement: "",
  beforeAfterData: "",
  trustData: {
    salesCount: "",
    satisfactionRate: "",
    reviewCount: "",
    repurchaseRate: "",
  },
  policyInfo: {
    delivery: "",
    refund: "",
    as: "",
  },
};

export function createDefaultForm(template: TemplateType): TemplateInput {
  switch (template) {
    case "coupang":
      return {
        ...BASE_DEFAULTS,
        template: "coupang",
        originalPrice: "",
        discountRate: "",
        finalPrice: "",
        deliveryInfo: "",
        certificationBadges: [],
        reviewHighlights: ["", "", ""],
        rocketBadge: true,
        urgencyMessage: "",
      };
    case "smartstore":
      return {
        ...BASE_DEFAULTS,
        template: "smartstore",
        brandStory: "",
        productOrigin: "",
        sourcingStory: "",
        hashtags: [],
        qaItems: [{ question: "", answer: "" }],
        ingredientDetails: "",
        certifications: [],
        naverPayBadge: true,
        usageGuide: "",
      };
    case "premium":
      return {
        ...BASE_DEFAULTS,
        template: "premium",
        brandHeritage: "",
        materialsStory: "",
        limitedEditionInfo: "",
        unboxingDescription: "",
        endorsements: [{ name: "", quote: "", platform: "Instagram" }],
        videos: [],
        collectionName: "",
      };
  }
}
