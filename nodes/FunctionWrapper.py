import torch
import torch.nn.functional as F
import pytorch_lightning as pl
import matplotlib.pyplot as plt

class FunctionWrapper(pl.LightningModule):
    def __init__(self, function, *args, **kwargs):
        super(FunctionWrapper, self).__init__()
        self.function = function
        self.default_args = args
        self.default_kwargs = kwargs

    def forward(self, t, *args, **kwargs):
        # Merge default arguments with those provided in the forward call
        final_args = args + self.default_args
        final_kwargs = {**kwargs, **self.default_kwargs}
        
        # Apply the function with the combined args and kwargs
        result = self.function(t, *final_args, **final_kwargs)
        return result

# Example usage:
if __name__ == "__main__":
    # Example input tensor: a batch of 1 image with 1 channel (1, 1, 5, 5)
    input_tensor = torch.randn(1, 1, 5, 5)
    
    # Example weight tensor: 1 filter of size 3x3 (1, 1, 3, 3)
    weight_tensor = torch.randn(1, 1, 3, 3)
    
    # Example bias tensor: 1 value (1,)
    bias_tensor = torch.randn(1)

    # Create FunctionWrapper instance for conv2d without specifying weight or bias
    conv2d_wrapper = FunctionWrapper(
        F.conv2d,
        stride=1,
        padding=1
    )
    
    # Apply conv2d to input tensor, specifying weight and bias in the forward call
    conv_output = conv2d_wrapper(input_tensor, weight_tensor, bias=bias_tensor)
    print(conv_output.shape)  # Output shape should be (1, 1, 5, 5)
    print(conv_output)  # Display the generated output

    # Plot the input and output images
    input_image = input_tensor.squeeze().numpy()
    output_image = conv_output.squeeze().detach().numpy()

    fig, axs = plt.subplots(1, 2, figsize=(10, 5))
    axs[0].imshow(input_image, cmap='gray')
    axs[0].set_title('Input Image')
    axs[1].imshow(output_image, cmap='gray')
    axs[1].set_title('Output Image')
    plt.show()
