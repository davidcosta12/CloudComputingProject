package com.cloudcomputing.dto;

import com.cloudcomputing.model.Item;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateItemDTO {

    @NotBlank(message = "O nome é obrigatório")
    @Size(max = 100, message = "O nome deve ter no máximo 100 caracteres")
    private String name;

    @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres")
    private String description;

    public CreateItemDTO() {}

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Item toItem() {
        Item item = new Item();
        item.setName(this.name);
        item.setDescription(this.description);
        return item;
    }
}

