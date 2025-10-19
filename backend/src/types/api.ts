export interface ApiResponseData<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  timestamp: string;
}

export class ApiResponse {
  static success<T>(data?: T, message?: string): ApiResponseData<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  }

  static error(error: string, statusCode?: number, errors?: any[]): ApiResponseData {
    return {
      success: false,
      error,
      errors,
      timestamp: new Date().toISOString()
    };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): ApiResponseData<T[]> {
    return {
      success: true,
      data,
      message,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    };
  }
}

export interface RequestWithServices extends Request {
  services: {
    blockchain: any;
    database: any;
    websocket: any;
    aiEngine: any;
  };
  user?: {
    address: string;
    signature: string;
  };
}
